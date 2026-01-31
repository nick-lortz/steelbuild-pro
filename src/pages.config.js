/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from './pages/Analytics';
import BudgetControl from './pages/BudgetControl';
import Calendar from './pages/Calendar';
import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import DailyLogs from './pages/DailyLogs';
import DailyLogsExport from './pages/DailyLogsExport';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Detailing from './pages/Detailing';
import DocumentLinkage from './pages/DocumentLinkage';
import Documents from './pages/Documents';
import Equipment from './pages/Equipment';
import ExecutiveRollUp from './pages/ExecutiveRollUp';
import Fabrication from './pages/Fabrication';
import FieldTools from './pages/FieldTools';
import FieldToolsMobile from './pages/FieldToolsMobile';
import Financials from './pages/Financials';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';
import JobStatusReport from './pages/JobStatusReport';
import Labor from './pages/Labor';
import LaborScope from './pages/LaborScope';
import LandingPage from './pages/LandingPage';
import LookAheadPlanning from './pages/LookAheadPlanning';
import Meetings from './pages/Meetings';
import Messages from './pages/Messages';
import NotificationSettings from './pages/NotificationSettings';
import Performance from './pages/Performance';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProductionMeetings from './pages/ProductionMeetings';
import Profile from './pages/Profile';
import ProjectDashboard from './pages/ProjectDashboard';
import ProjectPhotos from './pages/ProjectPhotos';
import Projects from './pages/Projects';
import RFIs from './pages/RFIs';
import Reports from './pages/Reports';
import ResourceManagement from './pages/ResourceManagement';
import Resources from './pages/Resources';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Submittals from './pages/Submittals';
import TermsOfService from './pages/TermsOfService';
import ToDoList from './pages/ToDoList';
import WeeklySchedule from './pages/WeeklySchedule';
import WorkPackages from './pages/WorkPackages';
import ProjectSettings from './pages/ProjectSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "BudgetControl": BudgetControl,
    "Calendar": Calendar,
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "DailyLogs": DailyLogs,
    "DailyLogsExport": DailyLogsExport,
    "Dashboard": Dashboard,
    "Deliveries": Deliveries,
    "Detailing": Detailing,
    "DocumentLinkage": DocumentLinkage,
    "Documents": Documents,
    "Equipment": Equipment,
    "ExecutiveRollUp": ExecutiveRollUp,
    "Fabrication": Fabrication,
    "FieldTools": FieldTools,
    "FieldToolsMobile": FieldToolsMobile,
    "Financials": Financials,
    "Insights": Insights,
    "Integrations": Integrations,
    "JobStatusReport": JobStatusReport,
    "Labor": Labor,
    "LaborScope": LaborScope,
    "LandingPage": LandingPage,
    "LookAheadPlanning": LookAheadPlanning,
    "Meetings": Meetings,
    "Messages": Messages,
    "NotificationSettings": NotificationSettings,
    "Performance": Performance,
    "PrivacyPolicy": PrivacyPolicy,
    "ProductionMeetings": ProductionMeetings,
    "Profile": Profile,
    "ProjectDashboard": ProjectDashboard,
    "ProjectPhotos": ProjectPhotos,
    "Projects": Projects,
    "RFIs": RFIs,
    "Reports": Reports,
    "ResourceManagement": ResourceManagement,
    "Resources": Resources,
    "Schedule": Schedule,
    "Settings": Settings,
    "Submittals": Submittals,
    "TermsOfService": TermsOfService,
    "ToDoList": ToDoList,
    "WeeklySchedule": WeeklySchedule,
    "WorkPackages": WorkPackages,
    "ProjectSettings": ProjectSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};