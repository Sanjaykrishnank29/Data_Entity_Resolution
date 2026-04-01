from rapidfuzz import fuzz, distance

jw = distance.JaroWinkler.normalized_similarity("sanjay", "senjai")
jw1 = distance.JaroWinkler.normalized_similarity("sanjay krishnan", "senjai raj")


lsh = distance.Levenshtein.normalized_similarity("sanjay", "sanjai")
lsh1 = distance.Levenshtein.normalized_similarity("sanjay krishnan", "sanjai raj")

tsr = fuzz.token_sort_ratio("sanjay", "sanjai")
tsr1 = fuzz.token_sort_ratio("sanjay krishnan", "sanjai raj")

print(jw)
print(jw1)
print()
print(lsh)
print(lsh1)
print()
print(tsr)
print(tsr1)


