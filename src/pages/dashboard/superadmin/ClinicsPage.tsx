import React from "react";
import ClinicManagementTab from "./ClinicManagementTab";
import PageHeader from "../../../components/common/PageHeader";
import PageContainer from "../../../components/common/PageContainer";

const ClinicsPage: React.FC = () => {
  return (
    <PageContainer className="space-y-2 2xl:space-y-4">
      <PageHeader title="Clinic Management" description="Manage and monitor all registered clinics on the platform."

      />
      <ClinicManagementTab />
    </PageContainer>
  );
};

export default ClinicsPage;