import React from "react";
import { useLocation } from "react-router";
import NewAppointment from "./NewAppointment";

const NewAppointmentWrapper: React.FC = () => {
    const location = useLocation();
    // Create a key that changes when query params change to force remount
    const key = `${location.pathname}${location.search}`;

    return <NewAppointment key={key} />;
};

export default NewAppointmentWrapper;