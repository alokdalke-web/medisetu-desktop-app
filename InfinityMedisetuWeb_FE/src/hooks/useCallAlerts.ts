import { useEffect, useState, useRef } from "react";
import { getSocket, acknowledgeCall, declineCall } from "../services/socket";
import { useGetUserQuery } from "../redux/api/authApi";
import { useGetAllClinicsQuery } from "../redux/api/clinicApi";
import { useAppDispatch } from "../redux/hooks";
 import soundRec from "../../public/assets/ringtone/reception.mp3";

// 👤 Soft – Call next patient
import soundNext from "../../public/assets/ringtone/patient.mp3";
import {
  addActiveCall,
  removeActiveCall,
  setDoctorCallStatus,
} from "../redux/slices/callSlice";

export const useCallAlerts = () => {
  const dispatch = useAppDispatch();
  const { data: user } = useGetUserQuery();
  const { data: clinicData } = useGetAllClinicsQuery();
  const currentClinic = clinicData?.clinic;

  const [incomingCall, setIncomingCall] = useState<{
    doctorId: string;
    doctorName: string;
    clinicId: string;
    profileImage?: string;
    callType?: "RECEPTION" | "NEXT_PATIENT";
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
// 🔔 Urgent – Doctor calling Reception
 

const RECEPTION_TONE = soundRec;
const NEXT_PATIENT_TONE = soundNext;

const vibrate = (pattern: VibratePattern) => {
  const nav = navigator as Navigator & {
    userActivation?: { hasBeenActive?: boolean };
  };

  if (!("vibrate" in nav)) return;
  if (nav.userActivation && !nav.userActivation.hasBeenActive) return;

  nav.vibrate(pattern);
};

 
 

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const u = (user as any)?.user ?? user;
    const userType = u.userType;

    // Listen for incoming calls (Receptionist side)
const onCallIncoming = (data: {
  clinicId: string;
  doctorId: string;
  doctorName: string;
  profileImage?: string;
  ts: string;
  callType?: "RECEPTION" | "NEXT_PATIENT";
}) => {
  const isReceptionist = userType === "Receptionist";

  if (!isReceptionist || data.clinicId !== currentClinic?.id) return;

  // 📦 Save call
  setIncomingCall(data);
  dispatch(addActiveCall(data));

  // 🔊 Select ringtone
  const ringtone =
    data.callType === "NEXT_PATIENT"
      ? NEXT_PATIENT_TONE
      : RECEPTION_TONE;

 

  // 🎧 Setup audio (single instance)
  if (!audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.preload = "auto";
  }

  // Change source only if different
  if (audioRef.current.src !== ringtone) {
    audioRef.current.src = ringtone;
  }

  audioRef.current.currentTime = 0;

  // 🔉 Volume control
  audioRef.current.volume =
    data.callType === "NEXT_PATIENT" ? 0.4 : 1;

  audioRef.current
    .play()
    .catch(err =>
      console.warn("🔇 Audio blocked by browser:", err)
    );

  // 📳 Vibration
  vibrate([500, 200, 500]);

  vibrateIntervalRef.current = window.setInterval(() => {
    vibrate([500, 200, 500]);
  }, 2000);
};


    // Listen for acknowledgement
    const onCallAcknowledged = (data: {
      doctorId: string;
      receptionId: string;
      receptionName: string;
      ts: string;
    }) => {
      // If I'm the one who acknowledged, or if someone else did, clear the modal if it matches
      setIncomingCall((prev) =>
        prev?.doctorId === data.doctorId ? null : prev,
      );
      dispatch(removeActiveCall(data.doctorId));

      if (data.doctorId === u.id) {
        dispatch(setDoctorCallStatus("picked up"));
        // Reset doctor status after 10s
        setTimeout(() => dispatch(setDoctorCallStatus(null)), 10000);
      }
    };

    const onCallDeclined = (data: {
      doctorId: string;
      receptionId: string;
      receptionName: string;
      ts: string;
    }) => {
      // Clear modal for all receptionists
      setIncomingCall((prev) =>
        prev?.doctorId === data.doctorId ? null : prev,
      );
      dispatch(removeActiveCall(data.doctorId));

      if (data.doctorId === u.id) {
        dispatch(setDoctorCallStatus("rejected"));
        // Reset doctor status after 10s
        setTimeout(() => dispatch(setDoctorCallStatus(null)), 10000);
      }
    };

    const onCallCancelled = (data: { doctorId: string; clinicId: string }) => {
      setIncomingCall((prev) =>
        prev?.doctorId === data.doctorId ? null : prev,
      );
      dispatch(removeActiveCall(data.doctorId));
    };

    socket.on("call.incoming", onCallIncoming);
    socket.on("call.acknowledged", onCallAcknowledged);
    socket.on("call.declined", onCallDeclined);
    socket.on("call.cancelled", onCallCancelled);

    return () => {
      socket.off("call.incoming", onCallIncoming);
      socket.off("call.acknowledged", onCallAcknowledged);
      socket.off("call.declined", onCallDeclined);
      socket.off("call.cancelled", onCallCancelled);
    };
  }, [user, currentClinic, dispatch, NEXT_PATIENT_TONE, RECEPTION_TONE]);

  // Stop effects when incomingCall is cleared
  useEffect(() => {
    if (!incomingCall) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (vibrateIntervalRef.current) {
        clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = null;
        vibrate(0);
      }
    } else {
      // Ensure audio plays if incomingCall exists
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.warn(
            "Audio play failed, user interaction may be required:",
            err,
          );
        });
      }
    }
  }, [incomingCall]);

  const handlePickup = async () => {
    if (!incomingCall || !user) return;
    const u = (user as any)?.user ?? user;
    try {
      await acknowledgeCall({
        doctorId: incomingCall.doctorId,
        receptionId: u.id,
        receptionName: u.name,
        clinicId: incomingCall.clinicId,
      });
      setIncomingCall(null);
      dispatch(removeActiveCall(incomingCall.doctorId));
    } catch (_err: any) {
      // Failed to pickup call
    }
  };

  const handleDecline = async () => {
    if (!incomingCall || !user) return;
    const u = (user as any)?.user ?? user;
    try {
      await declineCall({
        doctorId: incomingCall.doctorId,
        receptionId: u.id,
        receptionName: u.name,
        clinicId: incomingCall.clinicId,
      });
      setIncomingCall(null);
      dispatch(removeActiveCall(incomingCall.doctorId));
    } catch (_err: any) {
      // Failed to decline call
    }
  };

  return {
    incomingCall,
    clearIncomingCall: () => setIncomingCall(null),
    handlePickup,
    handleDecline,
  };
};
