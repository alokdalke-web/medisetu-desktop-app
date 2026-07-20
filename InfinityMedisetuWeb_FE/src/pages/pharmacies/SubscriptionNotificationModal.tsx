import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Badge,
  Spinner,
} from "@heroui/react";
import { FiBell, FiX, FiClock, FiUser, FiPhone, FiMapPin, FiPackage, FiShoppingBag } from "react-icons/fi";
import { SubscriptionNotification } from "../../redux/api/pharmaciesApi";
import { useNavigate } from "react-router";

interface SubscriptionNotificationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: SubscriptionNotification[];
  loading: boolean;
  onMarkAsRead: () => void;
  onClose: () => void;
}

const SubscriptionNotificationModal: React.FC<SubscriptionNotificationModalProps> = ({
  isOpen,
  onOpenChange,
  notifications,
  loading,
  onMarkAsRead,
  onClose,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const toggleRowExpansion = (notificationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { color: "success" as const, label: "Active" };
      case "paused":
        return { color: "warning" as const, label: "Paused" };
      case "cancelled":
        return { color: "danger" as const, label: "Cancelled" };
      default:
        return { color: "default" as const, label: status };
    }
  };

  const handleClose = () => {
    onClose();
    onOpenChange(false);
  };

  const handleGenerateSale = (subscriptionId: string) => {
    navigate(`/pharmacy/patient-subscription/generate-sale/${subscriptionId}`);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: "border border-slate-200 dark:border-slate-700",
      }}
      closeButton={
        <Button
          isIconOnly
          variant="light"
          className="absolute right-2 top-2"
          onPress={handleClose}
        >
          <FiX className="text-xl" />
        </Button>
      }
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Badge content={notifications.length} color="danger" placement="top-right">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FiBell className="text-2xl text-primary" />
                    </div>
                  </Badge>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Delivery Notifications</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {notifications.length} subscription{notifications.length !== 1 ? 's' : ''} scheduled for delivery (Mark as Read to skip notifications for today)
                  </p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="py-4">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Spinner label="Loading notifications..." />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    No deliveries scheduled for today
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    All caught up! Check back later for new notifications.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => {
                    const statusConfig = getStatusConfig(notification.status);
                    const isExpanded = expandedRows.has(notification.id);
                    const hasMedicines = notification.medicines && notification.medicines.length > 0;

                    return (
                      <div
                        key={notification.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                      >
                        {/* Main Card */}
                        <div className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Customer Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FiUser className="text-slate-400" />
                                <span className="font-semibold">
                                  {notification.customerName || "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <FiPhone className="text-slate-400" />
                                <span>{notification.customerMobile || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <FiMapPin className="text-slate-400" />
                                <span>{notification.customerAddress || "N/A"}</span>
                              </div>
                            </div>

                            {/* Delivery Details */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FiClock className="text-slate-400" />
                                <span className="text-sm">
                                  Next Delivery: <span className="font-medium">{formatDate(notification.nextDeliveryDate)}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Chip variant="flat" color="primary" size="sm">
                                  Every {notification.frequencyDays} days
                                </Chip>
                              </div>
                              <div className="flex items-center gap-2">
                                <Chip
                                  color={statusConfig.color}
                                  variant="flat"
                                  size="sm"
                                >
                                  {statusConfig.label}
                                </Chip>
                              </div>
                            </div>

                            {/* Medicines Summary */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FiPackage className="text-slate-400" />
                                <span className="text-sm">
                                  {notification.medicines?.length || 0} medicine(s)
                                </span>
                              </div>
                              {notification.remarks && (
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  <span className="font-medium">Remarks:</span> {notification.remarks}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-1">
                                {hasMedicines && (
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                    onPress={() => toggleRowExpansion(notification.id)}
                                  >
                                    {isExpanded ? "Hide Details" : "Show Details"}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  startContent={<FiShoppingBag />}
                                  onPress={() => handleGenerateSale(notification.id)}
                                >
                                  Generate Sale
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Medicines Table */}
                        {isExpanded && hasMedicines && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
                              Medicines in this Subscription
                            </h4>
                            <div className="overflow-x-auto">
                              <Table removeWrapper classNames={{ base: "min-w-[500px]" }}>
                                <TableHeader>
                                  <TableColumn>SKU</TableColumn>
                                  <TableColumn>Medicine Name</TableColumn>
                                  <TableColumn>Brand</TableColumn>
                                  <TableColumn>Category</TableColumn>
                                  <TableColumn>Form</TableColumn>
                                  <TableColumn align="center">Quantity</TableColumn>
                                </TableHeader>
                                <TableBody>
                                  {notification.medicines.map((medicine: any) => (
                                    <TableRow key={medicine.id}>
                                      <TableCell>
                                        <span className="font-mono text-sm">{medicine.sku || "-"}</span>
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {medicine.medicineName || "Unknown"}
                                      </TableCell>
                                      <TableCell>{medicine.brand || "-"}</TableCell>
                                      <TableCell>{medicine.category || "-"}</TableCell>
                                      <TableCell>{medicine.form || "-"}</TableCell>
                                      <TableCell align="center">
                                        <Chip size="sm" variant="flat" color="primary">
                                          {medicine.quantity}
                                        </Chip>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="border-t border-slate-200 dark:border-slate-700">
              <Button variant="light" onPress={handleClose}>
                Close
              </Button>
              {notifications.length > 0 && (
                <Button color="primary" onPress={onMarkAsRead}>
                  Mark as Read
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SubscriptionNotificationModal;