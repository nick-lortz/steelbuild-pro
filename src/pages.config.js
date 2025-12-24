import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import DailyLogs from './pages/DailyLogs';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Drawings from './pages/Drawings';
import Equipment from './pages/Equipment';
import Financials from './pages/Financials';
import Insights from './pages/Insights';
import Labor from './pages/Labor';
import Meetings from './pages/Meetings';
import Performance from './pages/Performance';
import Projects from './pages/Projects';
import RFIs from './pages/RFIs';
import Resources from './pages/Resources';
import Schedule from './pages/Schedule';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "DailyLogs": DailyLogs,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "Drawings": Drawings,
    "Equipment": Equipment,
    "Financials": Financials,
    "Insights": Insights,
    "Labor": Labor,
    "Meetings": Meetings,
    "Performance": Performance,
    "Projects": Projects,
    "RFIs": RFIs,
    "Resources": Resources,
    "Schedule": Schedule,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};