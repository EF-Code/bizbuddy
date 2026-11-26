import json
import os
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

import main


class WebsiteChatTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        self.engine_patch = patch.object(main, 'engine', self.engine)
        self.engine_patch.start()
        self.env = patch.dict(os.environ, {'OPENAI_API_KEY': ''})
        self.env.start()
        self.client = TestClient(main.app)
        self.client.__enter__()
        response = self.client.post('/api/auth/register', json={
            'name': 'Shop Owner', 'business': 'Test Shop', 'email': 'owner@example.com', 'password': 'test-password',
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.auth = {'Authorization': 'Bearer ' + response.json()['token']}
        self.config = self.client.put('/api/chatbot', headers=self.auth, json={
            'name': 'Shop assistant', 'business_name': 'Test Shop', 'website_domain': 'https://shop.example.com',
            'welcome_message': 'Welcome to Test Shop', 'operating_hours': '9am to 5pm',
        }).json()
        self.client.patch('/api/chatbot/automation', headers=self.auth, json={'auto_responses': False})
        self.assertEqual(self.client.post('/api/chatbot/channels', headers=self.auth, json={'channel': 'website'}).status_code, 201)
        self.assertEqual(self.client.post('/api/chatbot/activate', headers=self.auth).status_code, 200)
        self.visitor = str(uuid4())
        self.origin = {'Origin': 'https://shop.example.com'}
        self.path = f"/api/public/chat/{self.config['public_id']}/{self.visitor}"

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.env.stop()
        self.engine_patch.stop()
        self.engine.dispose()

    def send(self, headers=None):
        return self.client.post('/api/public/chat', headers=headers or self.origin, json={
            'public_id': self.config['public_id'], 'conversation_id': self.visitor, 'message': 'Hello, I need help.',
        })

    def test_owner_only_chat_persistence_reply_and_isolation(self):
        response = self.send()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['needs_human'])
        conversation_id = response.json()['conversation_id']
        dashboard = self.client.get('/api/chatbot/dashboard', headers=self.auth).json()
        self.assertEqual(dashboard['conversations'][0]['messages'][0]['content'], 'Hello, I need help.')
        self.assertFalse(dashboard['ai_configured'])
        self.assertEqual(self.client.post(f'/api/chatbot/conversations/{conversation_id}/reply', json={'content': 'Hello from the owner!'}).status_code, 401)
        reply = self.client.post(f'/api/chatbot/conversations/{conversation_id}/reply', headers=self.auth, json={'content': 'Hello from the owner!'})
        self.assertEqual(reply.status_code, 200)
        transcript = self.client.get(self.path, headers=self.origin).json()['messages']
        self.assertEqual([item['sender'] for item in transcript], ['customer', 'owner'])
        self.assertEqual(self.client.get(self.path, headers=self.origin).json()['messages'], transcript)
        other = str(uuid4())
        self.assertEqual(self.client.get(self.path.replace(self.visitor, other), headers=self.origin).json()['messages'], [])

    def test_origin_and_disabled_chat(self):
        self.assertEqual(self.send({'Origin': 'https://evil.example'}).status_code, 403)
        config_path = f"/api/public/chat/{self.config['public_id']}"
        self.assertEqual(self.client.get(config_path, headers={'Referer': 'https://shop.example.com/page'}).status_code, 200)
        self.assertEqual(self.client.get(config_path, headers={'Origin': 'https://evil.example', 'Referer': 'https://shop.example.com/page'}).status_code, 403)
        self.client.post('/api/chatbot/deactivate', headers=self.auth)
        self.assertEqual(self.send().status_code, 404)
        self.assertEqual(self.client.get(self.path, headers=self.origin).status_code, 404)

    def test_ai_failure_saves_message_for_owner(self):
        self.client.patch('/api/chatbot/automation', headers=self.auth, json={'auto_responses': True})
        response = self.send()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['needs_human'])
        self.assertEqual(len(self.client.get(self.path, headers=self.origin).json()['messages']), 1)

    def test_ai_response_is_stored_and_returned_once(self):
        self.client.patch('/api/chatbot/automation', headers=self.auth, json={'auto_responses': True})
        with patch('main.generate_chatbot_reply', return_value={'reply': 'How can I help?', 'needs_human': False, 'order_request': False}):
            response = self.send()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['reply'], 'How can I help?')
        transcript = self.client.get(self.path, headers=self.origin).json()['messages']
        self.assertEqual([item['sender'] for item in transcript], ['customer', 'assistant'])


class OpenCodeTransportTests(unittest.IsolatedAsyncioTestCase):
    async def test_text_only_transport_uses_stdin_and_private_config(self):
        from unittest.mock import AsyncMock, MagicMock
        import ai_provider
        process = MagicMock(returncode=0)
        process.communicate = AsyncMock(return_value=(
            (json.dumps({'type': 'text', 'part': {'text': '{"reply":"Hello","needs_human":false,"order_request":false}'}}) + '\n').encode(), b''
        ))
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'must-not-reach-child'}):
            with patch('ai_provider.shutil.which', return_value='/usr/local/bin/opencode'):
                with patch('ai_provider.asyncio.create_subprocess_exec', new_callable=AsyncMock, return_value=process) as launch:
                    result = await ai_provider.opencode_reply('Business instructions', [{'role': 'user', 'content': 'Hi'}])
        self.assertEqual(json.loads(result)['reply'], 'Hello')
        args, kwargs = launch.call_args
        self.assertIn('--pure', args)
        self.assertIn('opencode/deepseek-v4.1-flash-free', args)
        self.assertNotIn('Hi', args)
        self.assertNotIn('OPENAI_API_KEY', kwargs['env'])
        config = json.loads(kwargs['env']['OPENCODE_CONFIG_CONTENT'])
        self.assertEqual(config['agent']['customer-chat']['permission'], {'*': 'deny'})
        self.assertEqual(config['agent']['customer-chat']['tools'], {'*': False})
        self.assertIn(b'Hi', process.communicate.call_args.args[0])
