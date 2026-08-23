from abc import ABC, abstractmethod
from typing import Any

class BaseProvider(ABC):
    """
    Base interface for all AI Model Providers.
    """
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'gemini', 'openai')"""
        pass

    @abstractmethod
    def get_model(self, identifier: str = '', **kwargs) -> Any:
        """
        Returns the configured LangChain chat model.
        identifier: an optional suffix like '_2' to support multiple configurations.
        """
        pass
