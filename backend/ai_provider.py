"""Text-only AI transport; no customer input is ever executed as a shell command."""
import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path

from fastapi import HTTPException

_slots = asyncio.Semaphore(2)


def ai_configured():
    if os.getenv('AI_PROVIDER', 'openai') == 'opencode':
        return bool(shutil.which(os.getenv('OPENCODE_BIN', 'opencode')))
    return bool(os.getenv('OPENAI_API_KEY'))


async def opencode_reply(system_prompt, history):
    executable = shutil.which(os.getenv('OPENCODE_BIN', 'opencode'))
    if not executable:
        raise HTTPException(503, 'OpenCode is not installed in the backend runtime.')
    if _slots.locked():
        raise HTTPException(429, 'The assistant is busy. Your message will be referred to the owner.')
    async with _slots:
        # New isolated config and session for every request. No app checkout,
        # inherited credentials, plugins, shell, file, web or delegation tools.
        with tempfile.TemporaryDirectory(prefix='bizbuddy-ai-') as directory:
            root = Path(directory)
            config = {
                'share': 'disabled',
                'autoupdate': False,
                'agent': {'customer-chat': {
                    'mode': 'primary', 'description': 'Text-only customer support',
                    'prompt': system_prompt, 'permission': {'*': 'deny'},
                    'tools': {'*': False}, 'steps': 1,
                }},
            }
            (root / 'opencode.json').write_text(json.dumps(config))
            allowed = ('PATH', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
                       'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
                       'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS', 'LANG')
            env = {key: os.environ[key] for key in allowed if key in os.environ}
            env.update({
                'XDG_CONFIG_HOME': str(root / 'config'), 'XDG_DATA_HOME': str(root / 'data'),
                'XDG_STATE_HOME': str(root / 'state'), 'XDG_CACHE_HOME': str(root / 'cache'),
                'npm_config_cache': str(root / 'npm-cache'),
                'OPENCODE_CONFIG_CONTENT': json.dumps(config),
            })
            try:
                process = await asyncio.create_subprocess_exec(
                    executable, 'run', '--pure', '--dir', directory, '--agent', 'customer-chat',
                    '--model', os.getenv('OPENCODE_MODEL', 'opencode/deepseek-v4.1-flash-free'),
                    '--format', 'json',
                    stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL, cwd=directory, env=env,
                )
            except OSError as error:
                raise HTTPException(503, "OpenCode could not start in the backend runtime.") from error
            try:
                output, _ = await asyncio.wait_for(
                    process.communicate(json.dumps(history[-20:]).encode()), timeout=45,
                )
            except asyncio.TimeoutError as error:
                raise HTTPException(504, 'The AI provider did not respond in time.') from error
            finally:
                if process.returncode is None:
                    process.kill()
                    await process.wait()
            if process.returncode:
                raise HTTPException(502, 'OpenCode could not complete the request.')
            parts = []
            for line in output.decode(errors='replace').splitlines():
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if event.get('type') == 'error':
                    raise HTTPException(502, 'OpenCode could not complete the request; check provider availability and usage limits.')
                if event.get('type') == 'text':
                    parts.append(event.get('part', {}).get('text', ''))
            content = ''.join(parts).strip()
            if content.startswith('```') and content.endswith('```'):
                content = '\n'.join(content.splitlines()[1:-1])
            return content
