import {
  getVisibleNavItems,
  getUiStateForErrorCode,
  type ApiErrorCode,
  type NavItemDefinition,
  type UserRole,
} from "@playblast/shared"

export function getMvpNavItemsForRole(
  role: UserRole,
  section: NavItemDefinition["section"],
) {
  return getVisibleNavItems(role, section)
}

export function mapApiErrorToUiState(code: ApiErrorCode) {
  return getUiStateForErrorCode(code)
}

export {
  APP_ROUTES,
  canRoleAccessRoute,
  createApiError,
  getClientRoutes,
  getNavVisibility,
  ROLE_BADGE_TOKENS,
  SETUP_PROGRESS_STEPS,
  UI_STATE_CATALOG,
} from "@playblast/shared"
