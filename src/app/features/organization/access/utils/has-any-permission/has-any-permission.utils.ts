/**
 * Function hasAnyOrganizationPermission
 * @description Matches effective grants against any required permission, including owner wildcards.
 * @param {readonly string[]} granted - Current effective grants.
 * @param {readonly string[]} required - Permissions accepted by the consumer.
 * @returns {boolean} Whether at least one requirement is satisfied.
 */
export function hasAnyOrganizationPermission(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((permission) => {
    const name = permission.trim();
    return (
      name.length > 0 &&
      granted.some((value) => {
        const grant = value.trim();
        return grant === name || (grant.endsWith('.*') && name.startsWith(grant.slice(0, -1)));
      })
    );
  });
}
