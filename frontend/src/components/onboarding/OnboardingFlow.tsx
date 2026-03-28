import { useOnboarding, setStep, completeOnboarding } from './onboardingStore';
import StepProfile from './StepProfile';
import StepTeamNames from './StepTeamNames';
import StepApiConfig from './StepApiConfig';
import StepPreferences from './StepPreferences';

const STEPS = [
  { label: 'SKILL PROFILE', desc: 'Tell us about yourself', color: '#E41937' },
  { label: 'NAME YOUR TEAM', desc: 'Customize your agents', color: '#F9D616' },
  { label: 'API CONFIG', desc: 'Connect your LLM provider', color: '#2BB6B3' },
  { label: 'PREFERENCES', desc: 'Set your work style', color: '#a855f7' },
];

export default function OnboardingFlow() {
  const state = useOnboarding();
  const { step } = state;
  const totalSteps = STEPS.length;

  const canProceed = () => {
    if (step === 0) return state.profile.name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: '#2BB6B3', backgroundImage: 'radial-gradient(#0A0A0A 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="border-4 border-[--color-ink] shadow-[8px_8px_0px_var(--color-ink)] w-full max-w-lg max-h-[90vh] flex flex-col" style={{ backgroundColor: '#F9D616' }}>
        <div className="tape tape-tl" />

        {/* Header */}
        <div className="px-4 py-3 border-b-4 border-[--color-ink]" style={{ backgroundColor: '#0A0A0A' }}>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: '#F9D616' }}>
            BUDDIES
          </h1>
          <p className="font-mono text-xs mt-0.5" style={{ color: 'rgba(242,244,243,0.5)' }}>
            // YOUR AI DEV TEAM. ALWAYS GOT YOUR BACK.
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-[--color-ink]/40">
              STEP {step + 1} OF {totalSteps}
            </span>
            <span className="text-[10px] font-display text-[--color-ink]">
              {STEPS[step].label}
            </span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="h-2 flex-1 border-2 border-[--color-ink]"
                style={{
                  backgroundColor: i <= step ? s.color : 'transparent',
                }}
              />
            ))}
          </div>
          <p className="text-[10px] font-mono text-[--color-ink]/40 mt-1">{STEPS[step].desc}</p>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {step === 0 && <StepProfile profile={state.profile} />}
          {step === 1 && <StepTeamNames teamNames={state.teamNames} />}
          {step === 2 && <StepApiConfig apiConfig={state.apiConfig} />}
          {step === 3 && <StepPreferences preferences={state.preferences} />}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 px-4 py-3 border-t-2 border-[--color-ink]/10">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 font-display text-sm uppercase border-2 border-[--color-ink] bg-[--color-paper] hover:bg-[--color-ink]/10 transition-all"
            >
              BACK
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 py-2.5 font-display text-base uppercase border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] hover:shadow-[1px_1px_0px_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#0A0A0A',
              color: '#F9D616',
            }}
          >
            {step === totalSteps - 1 ? 'ENTER HQ' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );
}
