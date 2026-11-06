import { Navigate, Route, Routes, useParams } from "react-router-dom";

import SetShell, { type View } from "./pages/SetShell";
import { DEFAULT_SET_CODE, lookupSet } from "./lib/sets";

const SetRoute = ({ view }: { view: View }) => {
  const { setCode } = useParams();
  const set = lookupSet(setCode);
  if (!set) return <Navigate to={`/${DEFAULT_SET_CODE}`} replace />;
  if (set.code !== setCode) return <Navigate to={`/${set.code}`} replace />;
  return <SetShell set={set} view={view} />;
};

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to={`/${DEFAULT_SET_CODE}`} replace />} />
    <Route path="/:setCode" element={<SetRoute view="grades" />} />
    <Route path="/:setCode/lists" element={<SetRoute view="lists" />} />
    <Route path="/:setCode/lists/:listId" element={<SetRoute view="editor" />} />
    <Route path="/:setCode/compare" element={<SetRoute view="compare" />} />
    <Route path="*" element={<Navigate to={`/${DEFAULT_SET_CODE}`} replace />} />
  </Routes>
);

export default App;
