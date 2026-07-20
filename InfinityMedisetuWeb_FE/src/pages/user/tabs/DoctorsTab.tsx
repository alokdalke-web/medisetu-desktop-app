import React from "react";
import UsersRoleTable from "../components/UsersRoleTable";

const DoctorsTab: React.FC = () => {
  return (
    <UsersRoleTable
      userType="Doctor"
      title=""
      showAddButton={false}
    />
  );
};

export default DoctorsTab;
