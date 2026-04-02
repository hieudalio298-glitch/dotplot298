export default function Loading() {
    return (
        <div className="flex flex-col h-[calc(100vh-56px)] bg-[#0a0a0a]">
            {/* Toolbar skeleton */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-[#0d0d0d]">
                <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-7 w-48 bg-white/5 rounded-lg animate-pulse" />
                <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse ml-2" />
            </div>
            {/* Map skeleton */}
            <div className="flex-1 p-2 grid grid-cols-6 grid-rows-3 gap-1">
                {Array.from({ length: 18 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-white/[0.03] rounded animate-pulse"
                        style={{ animationDelay: `${i * 50}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}
