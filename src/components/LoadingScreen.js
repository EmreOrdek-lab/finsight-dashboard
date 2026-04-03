import React from 'react';
import PulseLoader from "react-spinners/PulseLoader";

const override = {
    display: "block",
    margin: "auto",
  };

//for when user (from auth) is still loading in
function LoadingScreen(props) {
    return (
        <div className="absolute inset-0 z-50 enterprise-overlay flex">
            <PulseLoader color="#94a3b8" cssOverride={override}/>
        </div>
    );
}

export default LoadingScreen;