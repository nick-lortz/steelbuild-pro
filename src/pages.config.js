import Analytics from './pages/Analytics';
import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import DailyLogs from './pages/DailyLogs';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Documents from './pages/Documents';
import Drawings from './pages/Drawings';
import Equipment from './pages/Equipment';
import Fabrication from './pages/Fabrication';
import Financials from './pages/Financials';
import Insights from './pages/Insights';
import Labor from './pages/Labor';
import LaborScope from './pages/LaborScope';
import LandingPage from './pages/LandingPage';
import Meetings from './pages/Meetings';
import Performance from './pages/Performance';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProductionMeetings from './pages/ProductionMeetings';
import Profile from './pages/Profile';
import ProjectDashboard from './pages/ProjectDashboard';
import Projects from './pages/Projects';
import RFIs from './pages/RFIs';
import Reports from './pages/Reports';
import ResourceManagement from './pages/ResourceManagement';
import Resources from './pages/Resources';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import TermsOfService from './pages/TermsOfService';
import WeeklySchedule from './pages/WeeklySchedule';
import WorkPackages from './pages/WorkPackages';
import Messages from './pages/Messages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "DailyLogs": DailyLogs,
    "Dashboard": Dashboard,
    "Deliveries": Deliveries,
    "Documents": Documents,
    "Drawings": Drawings,
    "Equipment": Equipment,
    "Fabrication": Fabrication,
    "Financials": Financials,
    "Insights": Insights,
    "Labor": Labor,
    "LaborScope": LaborScope,
    "LandingPage": LandingPage,
    "Meetings": Meetings,
    "Performance": Performance,
    "PrivacyPolicy": PrivacyPolicy,
    "ProductionMeetings": ProductionMeetings,
    "Profile": Profile,
    "ProjectDashboard": ProjectDashboard,
    "Projects": Projects,
    "RFIs": RFIs,
    "Reports": Reports,
    "ResourceManagement": ResourceManagement,
    "Resources": Resources,
    "Schedule": Schedule,
    "Settings": Settings,
    "TermsOfService": TermsOfService,
    "WeeklySchedule": WeeklySchedule,
    "WorkPackages": WorkPackages,
    "Messages": Messages,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};