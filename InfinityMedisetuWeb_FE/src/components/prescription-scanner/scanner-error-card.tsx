import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Code } from "@heroui/code";

type ScannerErrorCardProps = {
  errorMessage: string;
  onStartOver: () => void;
};

export function ScannerErrorCard({
  errorMessage,
  onStartOver,
}: ScannerErrorCardProps) {
  return (
    <Card shadow="sm">
      <CardBody className="space-y-4 py-8 text-center">
        <p className="text-lg font-semibold text-danger">Something went wrong</p>
        <Code color="danger">{errorMessage}</Code>
        <Button color="primary" onPress={onStartOver}>
          Start Over
        </Button>
      </CardBody>
    </Card>
  );
}
