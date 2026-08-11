import { useCallback, useState } from "react";
import { BrandLogo, ThemeToggle, StepIndicator } from "@components/common";
import { StepConfirm } from "@components/get-started/StepConfirm";
import { StepDetails } from "@components/get-started/StepDetails";
import { StepObjective } from "@components/get-started/StepObjective";
import { StepPlatforms } from "@components/get-started/StepPlatforms";
import { StepWelcome } from "@components/get-started/StepWelcome";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";

const steps = ["Welcome", "Objective", "Platforms", "Details", "Ready"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

export function GetStartedPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [objective, setObjective] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [details, setDetails] = useState<{ workspace: string; company: string; budget: number } | null>(null);


  const goTo = useCallback(
    (step: number) => {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentStep],
  );

  const toggleObjective = useCallback((id: string) => {
    setObjective((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }, []);

  const togglePlatform = useCallback((id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }, []);

  const handlePlatformsContinue = useCallback(() => {
    goTo(4);
  }, [goTo]);

  const handleDetailsContinue = useCallback(
    (data: { workspace: string; company: string; budget: number }) => {
      setDetails(data);
      goTo(5);
    },
    [goTo],
  );

  return (
    <>
      <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-fg)] flex flex-col">
        <div className="flex items-center justify-between px-[var(--spacing-4)] md:px-[var(--spacing-8)] h-16 shrink-0">
          <Link to="/" className="flex items-center shrink-0">
            <BrandLogo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {currentStep > 1 && currentStep < 5 && (
              <button
                onClick={() => goTo(5)}
                className="text-[var(--font-size-sm)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                type="button"
              >
                Skip all
              </button>
            )}
          </div>
        </div>

        {currentStep > 1 && (
          <div className="px-[var(--spacing-4)] py-[var(--spacing-4)] shrink-0">
            <StepIndicator
              steps={steps}
              currentStep={currentStep}
            />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-[var(--spacing-4)] py-[var(--spacing-8)]">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {currentStep === 1 && (
                  <StepWelcome onContinue={() => goTo(2)} />
                )}
                {currentStep === 2 && (
                  <StepObjective
                    selected={objective}
                    onToggle={toggleObjective}
                    onContinue={() => goTo(3)}
                    onSkip={() => goTo(3)}
                  />
                )}
                {currentStep === 3 && (
                  <StepPlatforms
                    selected={platforms}
                    onToggle={togglePlatform}
                    onContinue={handlePlatformsContinue}
                    onBack={() => goTo(2)}
                  />
                )}
                {currentStep === 4 && (
                  <StepDetails
                    onContinue={handleDetailsContinue}
                    onBack={() => goTo(3)}
                  />
                )}
                {currentStep === 5 && (
                  <StepConfirm objective={objective} platforms={platforms} details={details} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
