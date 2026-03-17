export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Override the admin layout - login page has its own layout without sidebar
  return <>{children}</>;
}
