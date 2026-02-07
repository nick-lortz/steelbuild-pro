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
import Performance from './pages/Performance';
import DailyLogs from './pages/DailyLogs';
import DailyLogsExport from './pages/DailyLogsExport';
import Financials from './pages/Financials';
import DocumentLinkage from './pages/DocumentLinkage';
import Documents from './pages/Documents';
import Drawings from './pages/Drawings';
import Contracts from './pages/Contracts';
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
import JobStatusReport from './pages/JobStatusReport';
import Labor from './pages/Labor';
import LookAheadPlanning from './pages/LookAheadPlanning';
import ChangeOrders from './pages/ChangeOrders';
import CostCodes from './pages/CostCodes';
import WeeklySchedule from './pages/WeeklySchedule';
import Deliveries from './pages/Deliveries';
import LaborScope from './pages/LaborScope';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Detailing from './pages/Detailing';
import FieldTools from './pages/FieldTools';
import ExecutiveRollUp from './pages/ExecutiveRollUp';
import WorkPackages from './pages/WorkPackages';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Equipment from './pages/Equipment';
import Fabrication from './pages/Fabrication';
import RFIHub from './pages/RFIHub';
import Projects from './pages/Projects';
import ResourceManagement from './pages/ResourceManagement';
import BudgetControl from './pages/BudgetControl';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Performance": Performance,
    "DailyLogs": DailyLogs,
    "DailyLogsExport": DailyLogsExport,
    "Financials": Financials,
    "DocumentLinkage": DocumentLinkage,
    "Documents": Documents,
    "Drawings": Drawings,
    "Contracts": Contracts,
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
    "JobStatusReport": JobStatusReport,
    "Labor": Labor,
    "LookAheadPlanning": LookAheadPlanning,
    "ChangeOrders": ChangeOrders,
    "CostCodes": CostCodes,
    "WeeklySchedule": WeeklySchedule,
    "Deliveries": Deliveries,
    "LaborScope": LaborScope,
    "Calendar": Calendar,
    "Analytics": Analytics,
    "Detailing": Detailing,
    "FieldTools": FieldTools,
    "ExecutiveRollUp": ExecutiveRollUp,
    "WorkPackages": WorkPackages,
    "Dashboard": Dashboard,
    "Schedule": Schedule,
    "Equipment": Equipment,
    "Fabrication": Fabrication,
    "RFIHub": RFIHub,
    "Projects": Projects,
    "ResourceManagement": ResourceManagement,
    "BudgetControl": BudgetControl,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};