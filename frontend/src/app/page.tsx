import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function RootPage() {
  const cookieStore = cookies();
  redirect(cookieStore.has('access_token') ? '/dashboard' : '/auth/login');
}