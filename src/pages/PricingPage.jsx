import { useEffect, useState } from "react";
import { request } from "../operationsApi";
import {
  Brand,
  Button,
  Icon,
  InlineError,
  LoadingPage,
  PageHeader,
  Status,
} from "../components/ui";
import AIConnectionPanel from "../components/AIConnectionPanel";

export function PlanOptions({ onStart }) {
  const [plans, setPlans] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request("/plans")
      .then((p) => {
        if (active) setPlans(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  if (!plans)
    return error ? <InlineError>{error}</InlineError> : <LoadingPage />;
  return (
    <div className="bb-pricing-grid">
      <section className="bb-panel bb-price-option">
        <Status tone="success">Available now</Status>
        <h2>Business workspace</h2>
        <p className="bb-price-amount">
          ₦0<span>/ month during early access</span>
        </p>
        <p>
          Start managing customers and automate replies with your own model
          connection.
        </p>
        <ul>
          {[
            "Private business workspace and unified inbox",
            "Website chat, customer profiles and order capture",
            "Invoice follow-ups and daily summaries",
            "Connect OpenAI, Groq or Google Gemini",
            "Set a monthly AI request cap",
            "Saved-fact replies and human handoffs",
          ].map((item) => (
            <li key={item}>
              <Icon name="check" size={18} />
              {item}
            </li>
          ))}
        </ul>
        <Button onClick={onStart}>
          Set up my assistant <Icon name="arrow" size={16} />
        </Button>
        <small>
          AI provider usage is billed by your chosen provider. Provider free
          tiers and limits may apply.
        </small>
      </section>
      <section className="bb-panel bb-price-option bb-price-managed">
        <Status tone={plans.managed_available ? "success" : "neutral"}>
          {plans.managed_available ? "Available" : "Coming soon"}
        </Status>
        <h2>BizBuddy managed AI</h2>
        <p className="bb-price-amount">
          {plans.managed_available ? "Included" : "Pricing at launch"}
          <span>
            {plans.managed_available
              ? "during early access"
              : "No charges or checkout yet"}
          </span>
        </p>
        <p>
          Model access managed by BizBuddy, with clear usage limits and no API
          key setup for your team.
        </p>
        <ul>
          {[
            `Model: ${plans.managed_model === "gpt-6-luna" ? "GPT-6-Luna" : plans.managed_model}`,
            `${plans.managed_limit} monthly AI requests when access is enabled`,
            "Business-specific knowledge and reply tone",
            "Usage monitoring and human handoffs",
          ].map((item) => (
            <li key={item}>
              <Icon name="check" size={18} />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="secondary" onClick={onStart}>
          {plans.managed_available
            ? "Choose managed AI"
            : "View AI access options"}
        </Button>
        <small>
          {plans.managed_available
            ? "Availability and provider limits apply."
            : "Managed AI is not open to new workspaces yet. You can connect your own model today."}
        </small>
      </section>
    </div>
  );
}

export default function PricingPage({ onNavigate, publicPage = false }) {
  const content = (
    <>
      <PageHeader
        title="AI replies. Clear costs."
        description="Start with a free business workspace. Choose who provides your AI."
      />
      <PlanOptions
        onStart={() =>
          onNavigate(
            publicPage
              ? sessionStorage.getItem("bizbuddyToken")
                ? "/dashboard/setup"
                : "/register"
              : "setup",
          )
        }
      />
      <section className="bb-pricing-facts">
        <h2>What should you expect to pay?</h2>
        <dl>
          <div>
            <dt>BizBuddy workspace</dt>
            <dd>Free during early access. No card needed.</dd>
          </div>
          <div>
            <dt>Your model API key</dt>
            <dd>
              Usage goes to your provider account. Your monthly request cap
              limits requests, not the provider’s currency charges.
            </dd>
          </div>
          <div>
            <dt>Customer channels</dt>
            <dd>
              Website chat is included. Telegram uses its free Bot API. Gmail
              account limits and Twilio’s WhatsApp/SMS pricing apply.
            </dd>
          </div>
        </dl>
      </section>
      {!publicPage && <AIConnectionPanel />}
    </>
  );
  return publicPage ? (
    <div className="bb bb-public-pricing">
      <header>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/");
          }}
        >
          <Brand />
        </a>
        <Button variant="secondary" onClick={() => onNavigate("/signin")}>
          Sign in
        </Button>
      </header>
      <main>{content}</main>
      <footer>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/");
          }}
        >
          Back to BizBuddy
        </a>
      </footer>
    </div>
  ) : (
    content
  );
}
