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
import Projects from './pages/Projects';
import Schedule from './pages/Schedule';
import DailyLogs from './pages/DailyLogs';
import DailyLogsExport from './pages/DailyLogsExport';
import DocumentLinkage from './pages/DocumentLinkage';
import Documents from './pages/Documents';
import Drawings from './pages/Drawings';
import FieldToolsMobile from './pages/FieldToolsMobile';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';
import LandingPage from './pages/LandingPage';
import LoadTesting from './pages/LoadTesting';
import LookAheadResourcePlanning from './pages/LookAheadResourcePlanning';
import Meetings from './pages/Meetings';
import Messages from './pages/Messages';
import MyActionItems from './pages/MyActionItems';
import NotificationSettings from './pages/NotificationSettings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProductionMeetings from './pages/ProductionMeetings';
import Profile from './pages/Profile';
import ProjectAnalyticsDashboard from './pages/ProjectAnalyticsDashboard';
import ProjectBudget from './pages/ProjectBudget';
import ProjectDashboard from './pages/ProjectDashboard';
import ProjectPhotos from './pages/ProjectPhotos';
import ProjectSettings from './pages/ProjectSettings';
import RFIs from './pages/RFIs';
import Reports from './pages/Reports';
import Resources from './pages/Resources';
import Settings from './pages/Settings';
import Submittals from './pages/Submittals';
import TermsOfService from './pages/TermsOfService';
import TestSuite from './pages/TestSuite';
import ToDoList from './pages/ToDoList';
import Contracts from './pages/Contracts';
import Fabrication from './pages/Fabrication';
import Financials from './pages/Financials';
import RFIHub from './pages/RFIHub';
import Analytics from './pages/Analytics';
import Labor from './pages/Labor';
import Detailing from './pages/Detailing';
import ExecutiveRollUp from './pages/ExecutiveRollUp';
import ResourceManagement from './pages/ResourceManagement';
import JobStatusReport from './pages/JobStatusReport';
import CostCodes from './pages/CostCodes';
import Performance from './pages/Performance';
import Calendar from './pages/Calendar';
import WeeklySchedule from './pages/WeeklySchedule';
import LookAheadPlanning from './pages/LookAheadPlanning';
import WorkPackages from './pages/WorkPackages';
import FieldTools from './pages/FieldTools';
import Equipment from './pages/Equipment';
import ChangeOrders from './pages/ChangeOrders';
import BudgetControl from './pages/BudgetControl';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import LaborScope from './pages/LaborScope';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Projects": Projects,
    "Schedule": Schedule,
    "DailyLogs": DailyLogs,
    "DailyLogsExport": DailyLogsExport,
    "DocumentLinkage": DocumentLinkage,
    "Documents": Documents,
    "Drawings": Drawings,
    "FieldToolsMobile": FieldToolsMobile,
    "Insights": Insights,
    "Integrations": Integrations,
    "LandingPage": LandingPage,
    "LoadTesting": LoadTesting,
    "LookAheadResourcePlanning": LookAheadResourcePlanning,
    "Meetings": Meetings,
    "Messages": Messages,
    "MyActionItems": MyActionItems,
    "NotificationSettings": NotificationSettings,
    "PrivacyPolicy": PrivacyPolicy,
    "ProductionMeetings": ProductionMeetings,
    "Profile": Profile,
    "ProjectAnalyticsDashboard": ProjectAnalyticsDashboard,
    "ProjectBudget": ProjectBudget,
    "ProjectDashboard": ProjectDashboard,
    "ProjectPhotos": ProjectPhotos,
    "ProjectSettings": ProjectSettings,
    "RFIs": RFIs,
    "Reports": Reports,
    "Resources": Resources,
    "Settings": Settings,
    "Submittals": Submittals,
    "TermsOfService": TermsOfService,
    "TestSuite": TestSuite,
    "ToDoList": ToDoList,
    "Contracts": Contracts,
    "Fabrication": Fabrication,
    "Financials": Financials,
    "RFIHub": RFIHub,
    "Analytics": Analytics,
    "Labor": Labor,
    "Detailing": Detailing,
    "ExecutiveRollUp": ExecutiveRollUp,
    "ResourceManagement": ResourceManagement,
    "JobStatusReport": JobStatusReport,
    "CostCodes": CostCodes,
    "Performance": Performance,
    "Calendar": Calendar,
    "WeeklySchedule": WeeklySchedule,
    "LookAheadPlanning": LookAheadPlanning,
    "WorkPackages": WorkPackages,
    "FieldTools": FieldTools,
    "Equipment": Equipment,
    "ChangeOrders": ChangeOrders,
    "BudgetControl": BudgetControl,
    "Dashboard": Dashboard,
    "Deliveries": Deliveries,
    "LaborScope": LaborScope,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};