import { useState } from "react";
import {
  getSigner,
  getTokenContract,
  getLendingContract,
  parseTokenAmount,
  isValidAddress,
  saveTxRecord,
  shortenAddress,
} from "../lib/ethers";

interface DemoModeProps {
  address: string;
  tokenAddress: string;
  lendingAddress: string;
  chainId: number | null;
  onPoolRefresh: () => void;
}

const STEPS = [
  { id: 1, label: "Lưu địa chỉ hợp đồng", action: "saveAddresses" },
  { id: 2, label: "Nạp token cho ví hiện tại", action: "mint" },
  { id: 3, label: "Tạo vòng hụi mẫu", action: "createPool" },
  { id: 4, label: "Tham gia vòng hụi", action: "joinPool" },
  { id: 5, label: "Bắt đầu vòng hụi", action: "startPool" },
  { id: 6, label: "Cho phép dùng token", action: "approve" },
  { id: 7, label: "Đóng kỳ hiện tại", action: "deposit" },
  { id: 8, label: "Đăng ký hốt", action: "submitOffer" },
  { id: 9, label: "Bỏ qua lượt hốt", action: "skipOffer" },
  { id: 10, label: "Chốt kỳ hiện tại", action: "withdrawRound" },
  { id: 11, label: "Tải lại dữ liệu vòng hụi", action: "refreshPool" },
];

export default function DemoMode({
  address,
  tokenAddress,
  lendingAddress,
  chainId,
  onPoolRefresh,
}: DemoModeProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const execDemoStep = async (action: string) => {
    if (!address) {
      setMsg("Vui lòng kết nối MetaMask trước.");
      return;
    }
    if (action !== "saveAddresses" && (!tokenAddress || !lendingAddress)) {
      setMsg("Vui lòng nhập và lưu địa chỉ hợp đồng trước.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const signer = await getSigner();
      if (!signer && action !== "saveAddresses") return;

      switch (action) {
        case "saveAddresses": {
          if (!isValidAddress(tokenAddress) || !isValidAddress(lendingAddress)) {
            setMsg("Địa chỉ hợp đồng chưa hợp lệ. Vui lòng kiểm tra lại trong phần Thiết lập hợp đồng.");
            break;
          }
          setMsg("Địa chỉ hợp đồng đã được lưu sẵn trong localStorage.");
          break;
        }
        case "mint": {
          const contract = getTokenContract(tokenAddress, signer!);
          const amount = parseTokenAmount("1000");
          const tx = await contract.mint(address, amount);
          setMsg(`Đang nạp token... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Nạp token demo", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Nạp token thành công! +1000 cUSD");
          break;
        }
        case "createPool": {
          const contract = getLendingContract(lendingAddress, signer!);
          const amount = parseTokenAmount("10");
          const tx = await contract.createPool("Hụi nhóm bạn thân", amount, 3);
          setMsg(`Đang tạo vòng hụi... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Tạo vòng hụi mẫu", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Tạo vòng hụi thành công!");
          break;
        }
        case "joinPool": {
          const contract = getLendingContract(lendingAddress, signer!);
          const tx = await contract.joinPool(1);
          setMsg(`Đang tham gia... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Tham gia vòng hụi", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Tham gia vòng hụi thành công!");
          break;
        }
        case "startPool": {
          const contract = getLendingContract(lendingAddress, signer!);
          const tx = await contract.startPool(1);
          setMsg(`Đang bắt đầu... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Bắt đầu vòng hụi", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Vòng hụi đã bắt đầu!");
          break;
        }
        case "approve": {
          const contract = getTokenContract(tokenAddress, signer!);
          const amount = parseTokenAmount("1000");
          const tx = await contract.approve(lendingAddress, amount);
          setMsg(`Đang cho phép... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Cho phép dùng token", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Đã cho phép hợp đồng dùng token!");
          break;
        }
        case "deposit": {
          const contract = getLendingContract(lendingAddress, signer!);
          const tx = await contract.deposit(1);
          setMsg(`Đang đóng... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Đóng kỳ này", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Đóng kỳ thành công!");
          break;
        }
        case "submitOffer": {
          const contract = getLendingContract(lendingAddress, signer!);
          const tx = await contract.submitWithdrawalOffer(1, parseTokenAmount("25"));
          setMsg(`Đang đăng ký hốt... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Đăng ký hốt kỳ này", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Đăng ký hốt thành công! Mức nhận: 25 cUSD");
          break;
        }
        case "skipOffer": {
          const contract = getLendingContract(lendingAddress, signer!);
          const tx = await contract.skipWithdrawalOffer(1);
          setMsg(`Đang bỏ qua... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Bỏ qua lượt hốt", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Đã bỏ qua lượt hốt.");
          break;
        }
        case "withdrawRound": {
          const contract = getLendingContract(lendingAddress, signer!);
          const tx = await contract.withdrawCurrentRound(1);
          setMsg(`Đang chốt... Tx: ${shortenAddress(tx.hash)}`);
          await tx.wait();
          saveTxRecord({ hash: tx.hash, action: "Chốt người hốt kỳ này", from: address, timestamp: Date.now(), chainId: chainId ?? 0 });
          setMsg("Chốt kỳ thành công!");
          break;
        }
        case "refreshPool": {
          onPoolRefresh();
          setMsg("Đã tải lại dữ liệu vòng hụi.");
          break;
        }
      }
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStep = (step: typeof STEPS[number]) => {
    setCurrentStep(step.id);
    execDemoStep(step.action);
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">
        Chế độ demo nhanh
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Chế độ demo nhanh giúp bạn thao tác giống một ứng dụng thật. Website tự chuẩn bị dữ liệu và gọi đúng hàm smart contract, còn MetaMask vẫn yêu cầu bạn xác nhận giao dịch để đảm bảo đúng cơ chế chữ ký điện tử.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => handleStep(step)}
            disabled={loading || !address}
            className={`text-left text-sm px-3 py-2.5 rounded-lg transition-colors border disabled:opacity-50 ${
              currentStep === step.id
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="block text-[10px] text-slate-400 mb-0.5">Bước {step.id}</span>
            <span className="block text-xs leading-tight">{step.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-sm text-blue-600 mb-2">
          Đang xử lý... Vui lòng xác nhận trong MetaMask.
        </div>
      )}

      {msg && (
        <div
          className={`text-sm px-4 py-2 rounded-lg break-all ${
            msg.includes("thành công") || msg.includes("Đã cho") || msg.includes("Đã tải") || msg.includes("Đã bỏ") || msg.includes("được lưu")
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-slate-50 border border-slate-200 text-slate-700"
          }`}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
