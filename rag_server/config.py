# Import dynamic configuration management
try:
    # Try relative import first (when used as package)
    from .instance_config import get_instance_config
except ImportError:
    # Fall back to absolute import (when run directly)
    try:
        from instance_config import get_instance_config
    except ImportError:
        # Fallback to manual configuration if instance_config not available
        import os
        
        class FallbackConfig:
            def __init__(self):
                self.ec2_instance_ip = os.getenv("EC2_INSTANCE_IP", "localhost")
                self.embedding_url = f"http://{self.ec2_instance_ip}:8810"
                self.reranking_url = f"http://{self.ec2_instance_ip}:8811"
                self.api_base_url = f"http://{self.ec2_instance_ip}:8812"
        
        def get_instance_config():
            return FallbackConfig()

# Get current instance configuration
_config = get_instance_config()

# embedding model config
EMBEDDING_BATCH_SIZE = 32
EMBEDDING_SERVER = _config.embedding_url

RERANKING_BATCH_SIZE = 32
RERANKING_SERVER = _config.reranking_url

# split chunk config
BERT_PATH = "bert-base-uncased"    # 'bert-base-uncased'
MAX_SIZE = 512

# milvus config (Zilliz Cloud) - Updated with current cluster details
CONNECTION_ARGS = {
    'uri': 'https://in03-088dd53cf6b3582.serverless.gcp-us-west1.cloud.zilliz.com',
    'token': 'affa13223a768e6e16b4e2bebf1e3f95b7b9085814d1407470c10922c7469d459cf523c189e99e24a20a1146976edd1a808d34fc',
    'user': 'db_088dd53cf6b3582',
    'password': 'Kl0/,DPOure%ho3Z'
}
COLLECTION_NAME = "geodocs"

# rerank config
VEC_RECALL_NUM = 128
TOP_K = 3
META = True
SCORE_THRESHOLD = 1.5

# expand chunk config
CHUNK_PATH_NAME = "split_chunks"
EXPAND_RANGE = 1024
EXPAND_TIME_OUT = 30

# LLM config (AWS Sagemaker)
LLM_URL = "https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/GeoGPT-R1-Sagemaker-Endpoint/invocations"
LLM_KEY = "aws-sagemaker-endpoint"

# use deepseek r1 rag prompt template
RAG_PROMPT = '''# The following contents are the search results related to the user's message:
        {search_results}
        In the search results I provide to you, each result is formatted as [document X begin]...[document X end], where X represents the numerical index of each article. Please cite the context at the end of the relevant sentence when appropriate. Use the citation format [citation:X] in the corresponding part of your answer. If a sentence is derived from multiple contexts, list all relevant citation numbers, such as [citation:3][citation:5]. Be sure not to cluster all citations at the end; instead, include them in the corresponding parts of the answer.
        When responding, please keep the following points in mind:
        - Today is {cur_date}.
        - Not all content in the search results is closely related to the user's question. You need to evaluate and filter the search results based on the question.
        - If all the search results are irrelevant, please answer the question by yourself  professionally and concisely.
        - The search results may focus only on a few points, use the information it provided, but do not favor those points in your answer, reason and answer by yourself all-sidedly with full consideration. 
        - For listing-type questions (e.g., listing all flight information), try to limit the answer to 10 key points and inform the user that they can refer to the search sources for complete information. Prioritize providing the most complete and relevant items in the list. Avoid mentioning content not provided in the search results unless necessary.
        - For creative tasks (e.g., writing an essay), ensure that references are cited within the body of the text, such as [citation:3][citation:5], rather than only at the end of the text. You need to interpret and summarize the user's requirements, choose an appropriate format, fully utilize the search results, extract key information, and generate an answer that is insightful, creative, and professional. Extend the length of your response as much as possible, addressing each point in detail and from multiple perspectives, ensuring the content is rich and thorough.
        - If the response is lengthy, structure it well and summarize it in paragraphs. If a point-by-point format is needed, try to limit it to 5 points and merge related content.
        - For objective Q&A, if the answer is very brief, you may add one or two related sentences to enrich the content.
        - Choose an appropriate and visually appealing format for your response based on the user's requirements and the content of the answer, ensuring strong readability.
        - Your answer should synthesize information from multiple relevant documents and avoid repeatedly citing the same document.
        - Unless the user requests otherwise, your response should be in the same language as the user's question.
        # The user's message is:
        {question}'''
