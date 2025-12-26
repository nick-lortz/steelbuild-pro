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
import ProductionMeetings from './pages/ProductionMeetings';
import Projects from './pages/Projects';
import RFIs from './pages/RFIs';
import Reports from './pages/Reports';
import Resources from './pages/Resources';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import WeeklySchedule from './pages/WeeklySchedule';
import Deliveries from './pages/Deliveries';
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
    "ProductionMeetings": ProductionMeetings,
    "Projects": Projects,
    "RFIs": RFIs,
    "Reports": Reports,
    "Resources": Resources,
    "Schedule": Schedule,
    "Settings": Settings,
    "LandingPage": LandingPage,
    "WeeklySchedule": WeeklySchedule,
    "Deliveries": Deliveries,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};