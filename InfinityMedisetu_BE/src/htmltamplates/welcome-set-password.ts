import {
  renderActionButton,
  renderAlertBox,
  renderEmailLayout,
  renderValidityNotice,
} from './emailTemplateLayout';

type WelcomeSetPasswordParams = {
  name: string;
  clinicName: string;
  resetUrl: string;
};

export const welcomeSetPasswordTemplate = ({
  name,
  clinicName,
  resetUrl,
}: WelcomeSetPasswordParams): string => {
  const displayName = name.trim() || 'there';
  const greeting = displayName.toLowerCase().startsWith('dr')
    ? `Dear ${displayName} 👋`
    : `Hi, ${displayName} 👋`;

  return renderEmailLayout({
    title: 'Set Your Password',
    preview: 'Set your password to start using Infinity MediSetu.',
    greeting,
    headline: `Welcome to ${clinicName}!`,
    message:
      'Your account has been created. To get started, please set your password using the button below.',
    bodyHtml: `
      ${renderValidityNotice('This link will expire in <strong>24 hours</strong>.')}
      ${renderActionButton('Set Your Password', resetUrl)}
      ${renderAlertBox(
        'Security Note',
        "If you're not expecting this email, please contact the clinic administrator.",
        'warning'
      )}
    `,
  });
};
