import { Button, Icon, Status } from "./ui";

export default function AiPresence({
  engine,
  example = false,
  compact = false,
  onManage,
}) {
  const ready = engine?.provider === "opencode" && engine.state === "ready";
  const limited = engine?.provider === "opencode" && engine.state === "limited";
  const configured =
    engine?.provider === "opencode" || engine?.provider === "openai";
  const status = example
    ? "Example AI workflow"
    : ready
      ? "AI available"
      : limited
        ? "Knowledge fallback"
        : configured
          ? "Checking AI access"
          : "Knowledge replies";
  const detail = example
    ? "See how customer questions become helpful replies and requests ready for your approval. Example replies are simulated."
    : ready
      ? "OpenCode drafts replies from your saved business knowledge. You stay in charge of orders and payments."
      : limited
        ? "The free AI provider has reached its usage limit. Saved business facts keep customer replies working."
        : configured
          ? "Your AI engine is configured. Fact-based replies keep conversations moving while model access is checked."
          : "Replies use your saved catalogue, policies and FAQs. AI model access is managed by your workspace administrator.";
  return (
    <section
      className={`bb-ai-presence ${compact ? "is-compact" : ""}`}
      aria-label={example ? "AI workflow preview" : "AI implementation status"}
    >
      <div className="bb-ai-presence-main">
        <span className="bb-ai-emblem">
          <Icon name="sparkle" size={25} />
        </span>
        <div>
          <h2>
            {example
              ? "AI assistance. Human control."
              : "Your AI-assisted workspace"}
          </h2>
          <p>{detail}</p>
        </div>
        <Status tone={limited ? "warning" : "info"}>{status}</Status>
        {onManage && (
          <Button variant="secondary" onClick={onManage}>
            Manage AI <Icon name="arrow" size={16} />
          </Button>
        )}
      </div>
      {!compact && (
        <div className="bb-ai-workflow">
          {[
            [
              "message",
              "Understand the question",
              "Customer and conversation context",
            ],
            [
              "sparkle",
              "Prepare a useful reply",
              "Saved products, policies and FAQs",
            ],
            [
              "shield",
              "Keep you in control",
              "Owner approval for orders and payments",
            ],
          ].map(([icon, title, description]) => (
            <div key={title}>
              <Icon name={icon} size={18} />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
