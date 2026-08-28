import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>
            <h1>PSTU National Hackathon 2026</h1>
          </CardTitle>
          <CardDescription>
            The team starter is ready for your challenge brief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button">Start building</Button>
        </CardContent>
      </Card>
    </main>
  );
}
