import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import DailyLogs from './pages/DailyLogs';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Drawings from './pages/Drawings';
import Financials from './pages/Financials';
import Insights from './pages/Insights';
import Projects from './pages/Projects';
import RFIs from './pages/RFIs';
import Resources from './pages/Resources';
import Equipment from './pages/Equipment';
import Meetings from './pages/Meetings';
import Labor from './pages/Labor';
import Performance from './pages/Performance';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "DailyLogs": DailyLogs,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "Drawings": Drawings,
    "Financials": Financials,
    "Insights": Insights,
    "Projects": Projects,
    "RFIs": RFIs,
    "Resources": Resources,
    "Equipment": Equipment,
    "Meetings": Meetings,
    "Labor": Labor,
    "Performance": Performance,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};