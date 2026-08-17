// src/pages/profile/Referrals.tsx
import { Button, Card, CardBody, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Pagination } from "@heroui/react";
import { useEffect, useState } from "react";
import { FiCopy, FiUsers, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import { useGenerateReferralCodeMutation } from "../../redux/api/referralApi";
import type { ReferralData } from "../../redux/api/referralApi";

export default function Referrals() {
  const [referralLink, setReferralLink] = useState("");
  const [totalReferral, setTotalReferral] = useState(0);
  const [pendingReferral, setPendingReferral] = useState(0);
  const [approvedReferral, setApprovedReferral] = useState(0);
  const [rejectedReferral, setRejectedReferral] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [allReferrals, setAllReferrals] = useState<ReferralData[]>([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const [generateReferral] = useGenerateReferralCodeMutation();

  useEffect(() => {
    handleGenerateReferral();
  }, []);

  const handleGenerateReferral = async () => {
    try {
      const response = await generateReferral().unwrap();
      setReferralLink(response.referralLink);
      setTotalReferral(response.totalReferrals || 0);
      setPendingReferral(response.pendingReferrals || 0);
      setApprovedReferral(response.approvedReferrals || 0);
      setRejectedReferral(response.rejectedReferrals || 0);
      setAllReferrals(response.allData || []);
    } catch (error: any) {

    }
  };

  const copyToClipboard = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="w-3 h-3" />;
      case 'rejected':
        return <FiXCircle className="w-3 h-3" />;
      case 'pending':
        return <FiClock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateCode = (code: string) => {
    return code.length > 30 ? `${code.substring(0, 30)}...` : code;
  };

  const pages = Math.ceil(allReferrals.length / rowsPerPage);
  const paginatedReferrals = allReferrals.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const inputClassNames = {
    label: "text-[12px] font-medium text-text-muted",
    inputWrapper:
      "h-11 rounded-full bg-surface border-line shadow-none data-[hover=true]:border-primary/40",
    input: "text-sm cursor-default",
  };

  const statsCards = [
    {
      title: "Total Referrals",
      value: totalReferral,
      icon: FiUsers,
      iconColor: "text-info",
      badgeBg: "bg-info/10",
    },
    {
      title: "Pending",
      value: pendingReferral,
      icon: FiClock,
      iconColor: "text-warning",
      badgeBg: "bg-warning/10",
    },
    {
      title: "Approved",
      value: approvedReferral,
      icon: FiCheckCircle,
      iconColor: "text-success",
      badgeBg: "bg-success/10",
    },
    {
      title: "Rejected",
      value: rejectedReferral,
      icon: FiXCircle,
      iconColor: "text-danger",
      badgeBg: "bg-danger/10",
    },
  ];

  return (
    <Card className="shadow-none rounded-2xl overflow-hidden bg-surface">
      <ProfilePageHeader
        icon={<FiUsers className="h-4 w-4" />}
        title="Referral Program"
        description="Share your referral link with others. When they sign up using your link, you'll get credit for the referral."
      />

      <CardBody className="p-5 sm:p-6 text-text">
        <div className="max-w-[630px] mb-8">
          <div className="flex">
            <Input
              value={referralLink}
              readOnly
              variant="bordered"
              classNames={{
                ...inputClassNames,
                inputWrapper: "h-11 rounded-l-full rounded-r-none flex-grow",
              }}
              placeholder="Will appear after generating referral code..."
            />
            <Button
              className="h-11 rounded-l-none rounded-r-full bg-primary text-white min-w-20"
              onPress={copyToClipboard}
              isDisabled={!referralLink}
            >
              <FiCopy className="w-4 h-4" /> {isCopied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="pt-6 border-t border-line">
          <h3 className="text-sm font-semibold text-text mb-3">
            Referral Statistics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`${stat.badgeBg} ${stat.iconColor} flex h-8 w-8 items-center justify-center rounded-lg`}
                  >
                    <stat.icon className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-bold text-text">
                  {stat.value}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {stat.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {allReferrals.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h3 className="text-sm font-semibold text-text mb-4">
              Referral History
            </h3>
            
            <Table 
              aria-label="Referral history table"
              bottomContent={
                pages > 1 ? (
                  <div className="flex w-full justify-center">
                    <Pagination
                      isCompact
                      showControls
                      showShadow
                      color="primary"
                      page={page}
                      total={pages}
                      onChange={(page) => setPage(page)}
                    />
                  </div>
                ) : null
              }
            >
              <TableHeader>
                <TableColumn>REFERRED TO</TableColumn>
                <TableColumn>COMMENTS</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>REFERRED AT</TableColumn>
              </TableHeader>
              <TableBody>
                {paginatedReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <span className="text-xs font-mono" title={referral.referredToName}>
                        {truncateCode(referral.referredToName)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {referral.comments || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={getStatusColor(referral.status) as any}
                        startContent={getStatusIcon(referral.status)}
                      >
                        {referral.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-text-muted">
                        {formatDate(referral.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}