import React, { useEffect, useState } from "react";
import { Card, CardBody, Spinner, Button } from "@heroui/react";
import { useVerifyEmailQuery } from "../../redux/api/authApi";
// If your project uses react-router-dom, swap the import below accordingly:
import { useNavigate } from "react-router";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

const LOGIN_PATH = "/login"; // ⬅️ change if needed

const VerifyEmail: React.FC = () => {
  // const [token, setToken] = useState<string | null>(null);
  const [seconds, setSeconds] = useState<number>(4);
  const navigate = useNavigate();

const params = new URLSearchParams(window.location.search);
const token = params.get("token");
const { isLoading, isError, isSuccess, error } = useVerifyEmailQuery(
  token!,
  { skip: !token }
);
  // Auto-redirect to Login after success
  useEffect(() => {
    if (!isSuccess) return;

    setSeconds(4);
    const tick = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    const go = setTimeout(() => {
      navigate(LOGIN_PATH, { replace: true });
    }, 4000);

    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [isSuccess, navigate]);

  const InvalidIcon = () => (
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 ring-8 ring-red-50 shadow-sm">
      <FiXCircle className="h-8 w-8" />
    </div>
  );

  const SuccessIcon = () => (
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 ring-8 ring-green-50 shadow-sm">
      <FiCheckCircle className="h-8 w-8" />
    </div>
  );

  // UI States
  const renderContent = () => {
    if (!token) {
      return (
        <>
          <InvalidIcon />
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            Invalid link
          </h2>
          <p className="text-slate-500">
            No verification token found. Please check your email link.
          </p>
          <Button
            className="mt-6"
            color="default"
            variant="flat"
            onPress={() => navigate(LOGIN_PATH)}
          >
            Go to Login
          </Button>
        </>
      );
    }

    if (isLoading) {
      return (
        <>
          <Spinner color="primary" size="lg" />
          <p className="mt-4 text-slate-500">Verifying your email…</p>
        </>
      );
    }

    if (isSuccess) {
      return (
        <>
          <SuccessIcon />
          <h2 className="text-2xl font-semibold text-slate-800 mb-1">
            Email verified
          </h2>
          <p className="text-slate-600">
            🎉 Your email has been successfully verified.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Please check your email for credentials.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Redirecting to Login in{" "}
            <span className="font-semibold">{seconds}</span>s…
          </p>
          <Button
            className="mt-5"
            color="primary"
            onPress={() => navigate(LOGIN_PATH, { replace: true })}
          >
            Go now
          </Button>
        </>
      );
    }

    if (isError) {
      return (
        <>
          <InvalidIcon />
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            Verification failed
          </h2>
          <p className="text-slate-500">
            {((error as any)?.data?.message as string) ||
              "The verification link is invalid or expired."}
          </p>
          <Button
            className="mt-6"
            color="default"
            variant="flat"
            onPress={() => navigate(LOGIN_PATH)}
          >
            Back to Login
          </Button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-4">
      <Card className="max-w-md w-full shadow-xl border border-slate-200">
        <CardBody className="p-8 flex flex-col items-center text-center">
          {renderContent()}
        </CardBody>
      </Card>
    </div>
  );
};

export default VerifyEmail;
