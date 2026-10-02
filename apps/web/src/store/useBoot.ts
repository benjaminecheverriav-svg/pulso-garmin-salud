"use client";

import { createElement, useEffect, useRef } from "react";
import { LoginModal } from "@/components/modals/LoginModal";
import { storage } from "@/lib/api";
import { useDash } from "./DashboardContext";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Arranque: espera el inicio de sesión automático y decide qué datos cargar. */
export function useBoot(): void {
  const { refreshStatus, loadData, startSync, openModal } = useDash();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      let st = await refreshStatus();
      for (let i = 0; i < 60 && st?.login.status === "logging_in" && !st.hasData; i++) {
        await wait(1500);
        st = await refreshStatus();
      }
      const wantDemo = storage.get("pulso-demo") === "1";
      if (st?.hasData && !wantDemo) return loadData(false);
      if (wantDemo || !st) return loadData(true);
      if (st.connected) return startSync(60);
      openModal(createElement(LoginModal, { error: st.login.error ?? "" }));
    })();
  }, [refreshStatus, loadData, startSync, openModal]);
}
