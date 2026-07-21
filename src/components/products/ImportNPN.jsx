import { useState } from "react";
import supabase from "../../lib/supabase";

export default function ImportNPN({ onSuccess, onClose }) {
  const [npn, setNpn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, product_name, brands, error }

  const handleImport = async () => {
    const cleaned = npn.trim();
    if (!cleaned) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-npn", {
        body: { npns: [cleaned] },
      });
      if (error) throw error;
      const r = data?.results?.[0] ?? {
        success: false,
        error: "导入函数未返回产品结果",
      };
      setResult(r);
      if (r?.success) onSuccess?.();
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
    setLoading(false);
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/20 z-[999]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed z-[1000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-[360px]">
        <h2 className="text-base font-semibold text-slate-800 mb-4">从 Health Canada 导入</h2>

        <div className="flex gap-2">
          <input
            value={npn}
            onChange={e => setNpn(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleImport()}
            placeholder="输入 NPN，如 80145433"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:border-blue-400"
          />
          <button
            onClick={handleImport}
            disabled={loading || !npn.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
          >
            {loading ? "导入中..." : "导入"}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
            {result.success ? (
              <>
                <div className="font-semibold mb-1">导入成功</div>
                <div>{result.product_name}</div>
                {result.brands?.length > 1 && (
                  <div className="text-xs mt-1 text-green-600">{result.brands.length} 个品牌名</div>
                )}
                <button onClick={onClose} className="mt-3 px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700">
                  关闭
                </button>
              </>
            ) : (
              <div>{result.error}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
