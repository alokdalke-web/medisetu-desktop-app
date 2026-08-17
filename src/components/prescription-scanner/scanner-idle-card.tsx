import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";

export function ScannerIdleCard() {
  return (
    <Card shadow="sm">
      <CardBody className="flex items-center justify-center py-12">
        <Progress
          aria-label="Creating session"
          color="primary"
          isIndeterminate
          label="Creating secure session..."
          size="sm"
        />
      </CardBody>
    </Card>
  );
}
