import { useLocalSearchParams } from "expo-router";
import { SubjectScreen } from "../../features/subject/SubjectScreen";

export default function SubjectRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  return <SubjectScreen id={id} />;
}
