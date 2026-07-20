import React from "react";
import UsersRoleTable from "../components/UsersRoleTable";

/**
 * Staff Management Tab — displays the list of all staff members
 * (Receptionist, Nurse, Pharmacist, Lab_Assistant, Radiologist).
 *
 * Adding new staff navigates to /user/new (handled by parent Users.tsx).
 * No popup modals — consistent with the Doctor tab pattern.
 */
const ReceptionManagementTab: React.FC = () => {
  return (
    <div className="w-full">
      <UsersRoleTable
        userType="Receptionist"
        title=""
        showAddButton={false}
        showEmptyAddCard={false}
      />
    </div>
  );
};

export default ReceptionManagementTab;
