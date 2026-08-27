from emotion_model import predict_emotion

audio_file = "test.wav"
print(f"Analyzing {audio_file} using emotion2vec+ (Primary)...")
results = predict_emotion(audio_file)

for item in results:
    print(f"  {item['emotion']:12s}: {item['score']*100:.2f}%")