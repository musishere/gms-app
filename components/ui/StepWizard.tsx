interface StepWizardProps {
  steps: string[];
  current: number;
  onStepClick?: (step: number) => void;
}

export default function StepWizard({ steps, current, onStepClick }: StepWizardProps) {
  return (
    <div className="flex gap-2 mb-6">
      {steps.map((label, i) => {
        const step = i + 1;
        const active = current === step;
        const done = current > step;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onStepClick?.(step)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
              active ? 'bg-emerald-500 text-white' : done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">Step {step}: </span>{label}
          </button>
        );
      })}
    </div>
  );
}
