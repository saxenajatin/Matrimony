import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
