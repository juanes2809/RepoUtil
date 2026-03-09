import { SignUp } from '@clerk/nextjs';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center py-16 bg-neutral-50">
        <SignUp />
      </main>
      <Footer />
    </div>
  );
}
