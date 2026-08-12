import { Alert, AlertDescription } from "@/components/ui/alert";

type AuthFormMessageProps = {
  error?: string;
  success?: string;
};

export function AuthFormMessage({ error, success }: AuthFormMessageProps) {
  if (!error && !success) return null;

  return (
    <Alert variant={error ? "destructive" : "default"}>
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}
