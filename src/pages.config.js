import Analytics from './pages/Analytics';
import Calendar from './pages/Calendar';
import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import CustomDashboard from './pages/CustomDashboard';
import DailyLogs from './pages/DailyLogs';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Detailing from './pages/Detailing';
import Documents from './pages/Documents';
import Equipment from './pages/Equipment';
import ExecutiveRollUp from './pages/ExecutiveRollUp';
import Fabrication from './pages/Fabrication';
import FieldTools from './pages/FieldTools';
import Financials from './pages/Financials';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';
import JobStatusReport from './pages/JobStatusReport';
import Labor from './pages/Labor';
import LaborScope from './pages/LaborScope';
import LandingPage from './pages/LandingPage';
import Meetings from './pages/Meetings';
import Messages from './pages/Messages';
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
import ToDoList from './pages/ToDoList';
import WeeklySchedule from './pages/WeeklySchedule';
import WorkPackages from './pages/WorkPackages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Calendar": Calendar,
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "CustomDashboard": CustomDashboard,
    "DailyLogs": DailyLogs,
    "Dashboard": Dashboard,
    "Deliveries": Deliveries,
    "Detailing": Detailing,
    "Documents": Documents,
    "Equipment": Equipment,
    "ExecutiveRollUp": ExecutiveRollUp,
    "Fabrication": Fabrication,
    "FieldTools": FieldTools,
    "Financials": Financials,
    "Insights": Insights,
    "Integrations": Integrations,
    "JobStatusReport": JobStatusReport,
    "Labor": Labor,
    "LaborScope": LaborScope,
    "LandingPage": LandingPage,
    "Meetings": Meetings,
    "Messages": Messages,
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
    "ToDoList": ToDoList,
    "WeeklySchedule": WeeklySchedule,
    "WorkPackages": WorkPackages,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};