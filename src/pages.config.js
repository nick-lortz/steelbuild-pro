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
import Admin from './pages/Admin';
import AdvancedReporting from './pages/AdvancedReporting';
import Analytics from './pages/Analytics';
import AuditDashboard from './pages/AuditDashboard';
import AuditFixQueue from './pages/AuditFixQueue';
import BudgetControl from './pages/BudgetControl';
import Calendar from './pages/Calendar';
import ChangeOrders from './pages/ChangeOrders';
import Contracts from './pages/Contracts';
import CostCodes from './pages/CostCodes';
import DailyLogs from './pages/DailyLogs';
import DailyLogsExport from './pages/DailyLogsExport';
import Dashboard from './pages/Dashboard';
import DataManagement from './pages/DataManagement';
import Deliveries from './pages/Deliveries';
import Detailing from './pages/Detailing';
import DocumentLinkage from './pages/DocumentLinkage';
import Documents from './pages/Documents';
import Drawings from './pages/Drawings';
import Equipment from './pages/Equipment';
import ErectionLookahead from './pages/ErectionLookahead';
import ExecutiveRollUp from './pages/ExecutiveRollUp';
import Fabrication from './pages/Fabrication';
import FeedbackLoop from './pages/FeedbackLoop';
import FieldTools from './pages/FieldTools';
import FieldToolsMobile from './pages/FieldToolsMobile';
import Financials from './pages/Financials';
import FinancialsRedesign from './pages/FinancialsRedesign';
import HowItWorks from './pages/HowItWorks';
import Insights from './pages/Insights';
import Integrations from './pages/Integrations';
import JobStatusReport from './pages/JobStatusReport';
import Labor from './pages/Labor';
import LaborScope from './pages/LaborScope';
import LandingPage from './pages/LandingPage';
import LoadTesting from './pages/LoadTesting';
import LookAheadPlanning from './pages/LookAheadPlanning';
import LookAheadResourcePlanning from './pages/LookAheadResourcePlanning';
import Meetings from './pages/Meetings';
import Messages from './pages/Messages';
import MyActionItems from './pages/MyActionItems';
import NotificationSettings from './pages/NotificationSettings';
import PMProjectControl from './pages/PMProjectControl';
import Performance from './pages/Performance';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ProductionMeetings from './pages/ProductionMeetings';
import Profile from './pages/Profile';
import ProjectAnalyticsDashboard from './pages/ProjectAnalyticsDashboard';
import ProjectBudget from './pages/ProjectBudget';
import ProjectDashboard from './pages/ProjectDashboard';
import ProjectPhotos from './pages/ProjectPhotos';
import ProjectSettings from './pages/ProjectSettings';
import Projects from './pages/Projects';
import RFIHub from './pages/RFIHub';
import RFIs from './pages/RFIs';
import Reports from './pages/Reports';
import ResourceManagement from './pages/ResourceManagement';
import Resources from './pages/Resources';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Submittals from './pages/Submittals';
import TermsOfService from './pages/TermsOfService';
import TestSuite from './pages/TestSuite';
import ToDoList from './pages/ToDoList';
import WeeklySchedule from './pages/WeeklySchedule';
import WorkPackages from './pages/WorkPackages';
import ExecutiveReports from './pages/ExecutiveReports';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdvancedReporting": AdvancedReporting,
    "Analytics": Analytics,
    "AuditDashboard": AuditDashboard,
    "AuditFixQueue": AuditFixQueue,
    "BudgetControl": BudgetControl,
    "Calendar": Calendar,
    "ChangeOrders": ChangeOrders,
    "Contracts": Contracts,
    "CostCodes": CostCodes,
    "DailyLogs": DailyLogs,
    "DailyLogsExport": DailyLogsExport,
    "Dashboard": Dashboard,
    "DataManagement": DataManagement,
    "Deliveries": Deliveries,
    "Detailing": Detailing,
    "DocumentLinkage": DocumentLinkage,
    "Documents": Documents,
    "Drawings": Drawings,
    "Equipment": Equipment,
    "ErectionLookahead": ErectionLookahead,
    "ExecutiveRollUp": ExecutiveRollUp,
    "Fabrication": Fabrication,
    "FeedbackLoop": FeedbackLoop,
    "FieldTools": FieldTools,
    "FieldToolsMobile": FieldToolsMobile,
    "Financials": Financials,
    "FinancialsRedesign": FinancialsRedesign,
    "HowItWorks": HowItWorks,
    "Insights": Insights,
    "Integrations": Integrations,
    "JobStatusReport": JobStatusReport,
    "Labor": Labor,
    "LaborScope": LaborScope,
    "LandingPage": LandingPage,
    "LoadTesting": LoadTesting,
    "LookAheadPlanning": LookAheadPlanning,
    "LookAheadResourcePlanning": LookAheadResourcePlanning,
    "Meetings": Meetings,
    "Messages": Messages,
    "MyActionItems": MyActionItems,
    "NotificationSettings": NotificationSettings,
    "PMProjectControl": PMProjectControl,
    "Performance": Performance,
    "PrivacyPolicy": PrivacyPolicy,
    "ProductionMeetings": ProductionMeetings,
    "Profile": Profile,
    "ProjectAnalyticsDashboard": ProjectAnalyticsDashboard,
    "ProjectBudget": ProjectBudget,
    "ProjectDashboard": ProjectDashboard,
    "ProjectPhotos": ProjectPhotos,
    "ProjectSettings": ProjectSettings,
    "Projects": Projects,
    "RFIHub": RFIHub,
    "RFIs": RFIs,
    "Reports": Reports,
    "ResourceManagement": ResourceManagement,
    "Resources": Resources,
    "Schedule": Schedule,
    "Settings": Settings,
    "Submittals": Submittals,
    "TermsOfService": TermsOfService,
    "TestSuite": TestSuite,
    "ToDoList": ToDoList,
    "WeeklySchedule": WeeklySchedule,
    "WorkPackages": WorkPackages,
    "ExecutiveReports": ExecutiveReports,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};