/**
 * Global scrollbar styles for request board
 * Customizes scrollbar appearance across browsers
 */
export const SCROLLBAR_STYLES = `
  .request-board-scroll {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }

  .request-board-scroll::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .request-board-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .request-board-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }

  .request-board-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;
