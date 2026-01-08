"""In-memory skill package storage service."""

from typing import Optional

from ..models import SkillPackage


class SkillStorage:
    """In-memory storage for skill packages."""

    def __init__(self):
        self._packages: dict[str, SkillPackage] = {}

    def save(self, package: SkillPackage) -> None:
        """Save a skill package.

        Args:
            package: SkillPackage to save.
        """
        self._packages[package.id] = package

    def get(self, package_id: str) -> Optional[SkillPackage]:
        """Get a skill package by ID.

        Args:
            package_id: ID of the package to retrieve.

        Returns:
            SkillPackage if found, None otherwise.
        """
        return self._packages.get(package_id)

    def delete(self, package_id: str) -> bool:
        """Delete a skill package.

        Args:
            package_id: ID of the package to delete.

        Returns:
            True if deleted, False if not found.
        """
        if package_id in self._packages:
            del self._packages[package_id]
            return True
        return False

    def list_all(self) -> list[SkillPackage]:
        """List all skill packages.

        Returns:
            List of all stored skill packages.
        """
        return list(self._packages.values())

    def clear(self) -> None:
        """Clear all stored packages."""
        self._packages.clear()


# Global storage instance
_storage: Optional[SkillStorage] = None


def get_skill_storage() -> SkillStorage:
    """Get the global skill storage instance."""
    global _storage
    if _storage is None:
        _storage = SkillStorage()
    return _storage
