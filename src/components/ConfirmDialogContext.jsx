import { createContext, useContext, useState } from "react";
import './ConfirmDialog.css'; 

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  // state: { message, title, okText, cancelText, resolve }

  const confirm = ({
    message,
    title = "",
    okText = "OK",
    cancelText = "キャンセル",
}) =>
   new Promise((resolve) => {
    setState({ message, title, okText, cancelText, resolve });
  });

  const handle = (result) => {
    state.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            {state.title && <h3>{state.title}</h3>}
            <p>{state.message}</p>
            <div className="dialog-buttons">
              <button
                className="btn-cancel"
                onClick={() => handle(false)}
              >
                {state.cancelText}
              </button>
              <button
                className="btn-ok"
                onClick={() => handle(true)}
              >
                {state.okText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);