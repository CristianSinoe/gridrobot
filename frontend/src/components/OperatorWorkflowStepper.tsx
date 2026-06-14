interface OperatorWorkflowStep {
  id: string;
  label: string;
  hint: string;
  status: "complete" | "current" | "pending";
}

interface OperatorWorkflowStepperProps {
  steps: readonly OperatorWorkflowStep[];
}

export const OperatorWorkflowStepper = ({ steps }: OperatorWorkflowStepperProps) => {
  return (
    <section className="operator-workflow" aria-label="Flujo operativo del operador">
      {steps.map((step, index) => (
        <article
          key={step.id}
          className={`operator-workflow__step operator-workflow__step--${step.status}`}
          aria-current={step.status === "current" ? "step" : undefined}
        >
          <div className="operator-workflow__index">
            <span>{step.status === "complete" ? "✓" : index + 1}</span>
          </div>
          <div className="operator-workflow__content">
            <strong>{step.label}</strong>
            <p>{step.hint}</p>
          </div>
        </article>
      ))}
    </section>
  );
};
