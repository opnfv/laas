from resource_inventory.models import ResourceManager
from api.models import JOB_TASK_CLASSLIST


class AbstractModelQuery():
    """
    This is a class made for querying abstract models.

    This class is itself abstract. create subclasses to
    query your own abstract models.
    """

    model_list = []

    @classmethod
    def filter(cls, *args, **kwargs):
        """
        Query all concrete model classes.

        Iterates over the model list and returns a list of all
        matching models from the classes given.
        Filter queries are given here as normal and are passed into the Django ORM
        for each concrete model
        """
        result = []
        for model in cls.model_list:
            result += list(model.objects.filter(*args, **kwargs))


class ResourceQuery(AbstractModelQuery):
    model_list = ResourceManager.RESOURCE_TYPES


class JobTaskQuery(AbstractModelQuery):
    model_list = JOB_TASK_CLASSLIST
