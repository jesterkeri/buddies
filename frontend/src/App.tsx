import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/layout/Dashboard';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { useOnboarding } from './components/onboarding/onboardingStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { completed } = useOnboarding();

  if (!completed) {
    return <OnboardingFlow />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
