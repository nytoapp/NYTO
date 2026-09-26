import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { AppText } from "../components/ui";

export function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
  }, []);
  if (!offline) {
    return null;
  }
  return <AppText role="caption">{t("offline")}</AppText>;
}
