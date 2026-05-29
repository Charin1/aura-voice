import re

def split_text_into_chunks(text: str, max_chars: int = 250) -> list[str]:
    """
    Splits long text into smaller chunks for stable TTS synthesis.
    Prioritizes splitting at sentence boundaries (. ! ?), then at commas, then at spaces.
    """
    if len(text) <= max_chars:
        return [text]

    chunks = []
    # Use regex to find sentence boundaries followed by space or end of string
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    
    current_chunk = ""
    for sentence in sentences:
        if len(sentence) > max_chars:
            # If a single sentence is too long, split it by commas
            sub_sentences = re.split(r'(?<=,)\s+', sentence)
            for sub in sub_sentences:
                if len(current_chunk) + len(sub) + 1 <= max_chars:
                    current_chunk = (current_chunk + " " + sub).strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = sub
        else:
            if len(current_chunk) + len(sentence) + 1 <= max_chars:
                current_chunk = (current_chunk + " " + sentence).strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk)
        
    return chunks
