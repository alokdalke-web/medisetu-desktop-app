import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
} from "@heroui/react";
import { FiShoppingBag } from "react-icons/fi";
import AddOnsPanel from "./AddOnsPanel";
import type { AddOn } from "../../redux/api/subscriptionApi";
import type { BillingCycleType } from "../../utils/subscriptionHelpers";

interface AddResourcesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    addOns: AddOn[];
    selected: Record<string, number>;
    onQtyChange: (id: string, qty: number) => void;
    planName: string;
    planPrice: number;
    addOnTotal: number;
    subtotal: number;
    billingCycle: BillingCycleType;
    couponCode: string;
    onCouponCodeChange: (code: string) => void;
    appliedCode: string | null;
    appliedDiscountPct: number;
    discountAmount: number;
    couponError: string | null;
    couponDescription?: string | null;
    isValidatingCoupon?: boolean;
    onApplyCoupon: () => void;
    onRemoveCoupon: () => void;
    totalPayable: number;
    onCheckout: () => void;
    isProcessing: boolean;
    isDisabled?: boolean;
}

/**
 * Add-on marketplace as an on-demand drawer.
 * Only appears when the user chooses to add resources — never permanently
 * occupies screen space.
 */
const AddResourcesDrawer = (props: AddResourcesDrawerProps) => {
    const { isOpen, onClose, ...panelProps } = props;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            placement="right"
            classNames={{
                base: "rounded-l-2xl",
                header: "border-b border-default-100",
            }}
        >
            <DrawerContent>
                <DrawerHeader className="flex items-center gap-2.5 px-5 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FiShoppingBag className="text-primary text-sm" />
                    </div>
                    <div>
                        <p className="text-[15px] font-semibold text-default-900 dark:text-white">
                            Add Resources
                        </p>
                        <p className="text-[11px] font-normal text-default-400">
                            Expand your plan with pro-rated add-ons
                        </p>
                    </div>
                </DrawerHeader>
                <DrawerBody className="px-5 py-4">
                    <AddOnsPanel {...panelProps} />
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
};

export default AddResourcesDrawer;
