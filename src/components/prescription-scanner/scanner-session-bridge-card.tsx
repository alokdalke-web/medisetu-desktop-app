import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";

type ScannerSessionBridgeCardProps = {
  otp: string;
  countdown: number;
  qrCodeUrl: string;
  phoneLink: string;
  onNewSession: () => void;
};

export function ScannerSessionBridgeCard({
  otp,
  qrCodeUrl,
  onNewSession,
}: ScannerSessionBridgeCardProps) {
  // const [iscopied, setIsCopied] = useState(false);

  return (
    <Card shadow="sm">
      <CardHeader className="flex flex-col items-start gap-1">
        <div className="flex flex-row items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          <h2 className="text-lg font-semibold">
            Scan from Phone</h2>
        </div>
        <p className="text-sm text-default-500">
          Scan the QR code, take a photo on your phone, and this page will pick
          it up automatically.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2">
          <Chip color="warning" size="sm">
            Waiting...
          </Chip>
          <Chip size="sm" variant="flat">
            OTP: {otp}
          </Chip>
        </div>
        {/* <div className="flex justify-between items-center">
          <p className="text-sm text-default-500">
            Expires in <strong>{countdown}s</strong>
          </p> */}
        {/* {phoneLink && (
            <Button onPress={handleCopyLink}>
              {iscopied ? "Copied!" : <span className="flex items-center space-x-0.5"><MdOutlineCopyAll />Copy Link</span>}
            </Button>
          )} */}
        {/* </div> */}
        <div className="flex justify-center">
          {qrCodeUrl ? (
            <img
              alt="QR code"
              className="h-52 w-52 rounded-xl border border-default-200 bg-default-50 p-2"
              src={qrCodeUrl}
            />
          ) : (
            <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-dashed border-default-300 text-default-400 text-sm">
              QR loading...
            </div>
          )}
        </div>

        <Button color="default" size="sm" variant="flat" onPress={onNewSession}>
          New Session
        </Button>
      </CardBody>
    </Card>
  );
}
